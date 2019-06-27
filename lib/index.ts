// import { topoSort } from "@botmock-api/utils";
import fetch from "node-fetch";
import { ProjectResponse } from "../";
import { DEFAULT_INTENTS } from "../templates";

interface ProjectVariables {
  projectId?: string;
  boardId?: string;
  teamId?: string;
  token: string;
}

export async function getProjectData({
  projectId,
  boardId,
  teamId,
  token,
}: ProjectVariables) {
  const BOTMOCK_API_URL = "https://app.botmock.com/api";
  const baseUrl = `${BOTMOCK_API_URL}/teams/${teamId}/projects/${projectId}`;
  // collect project data from endpoints
  const data = await Promise.all(
    ["intents", "entities", `boards/${boardId}`, ""].map(async path => {
      const res = await (await fetch(`${baseUrl}/${path}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      })).json();
      return res.hasOwnProperty("board") ? res.board.messages : res;
    })
  );
  return {
    data: data.filter(d => !d.hasOwnProperty("error")),
    errors: data.filter(d => d.hasOwnProperty("error")),
  };
}

type Slot = {
  name: string;
  type?: string;
  elicitationRequired?: boolean;
  confirmationRequired?: boolean;
  prompts?: { elicitation: string };
  validations?: { type: string; prompt: string; values?: string[] }[];
  samples?: string[];
};

type Slots = Slot[];

type DialogIntent = {
  confirmationRequired?: boolean;
  name: string;
  samples: string[];
  prompts?: {};
  slots?: Slots;
};

type Prompt = { id: string; variations: { type: string; value: string }[] };

type InteractionModel = {
  languageModel: {
    invocationName: string;
    intents?: Partial<DialogIntent>[];
    types?: { values: { name: { value: string; synonyms: string[] } }[] }[];
  };
  dialog?: {
    delegationStrategy?: string;
    intents: DialogIntent[];
  };
  prompts?: Prompt[];
};

type ProjectPayload = any[];

export function mapProjectDataToInteractionModel(
  data: ProjectPayload
): InteractionModel {
  let [intents, entities, messages, project] = data;
  // messages = topoSort(messages)
  const types = entities.map(entity => ({
    name: entity.name,
    values: entity.data.map(({ value }) => ({ name: { value } })),
  }));
  // define slots as a map of each unique variable appearing in the
  // utterances for this intent
  const getSlotsForIntent = (intent: {
    utterances?: { text: string; variables: any[] }[];
  }): Slots => {
    return (
      intent.utterances
        .filter(utterance => utterance.variables.length > 0)
        .reduce((acc, utterance) => {
          return [
            ...acc,
            utterance.variables.reduce((acc_, variable) => {
              return {
                ...acc_,
                // reduce on dynamic key names for sake of uniqueness
                [variable.name.replace(/%/g, "")]: {
                  // intent,
                  type: entities.find(entity => entity.id === variable.entity)
                    .name,
                  samples: intent.utterances
                    .filter(
                      utterance =>
                        utterance.variables.length > 0 &&
                        utterance.variables.some(({ name }) => variable.name)
                    )
                    .map(utterance => formatUtteranceText(utterance.text)),
                },
              };
            }, {}),
          ];
        }, [])
        // map the unique variables back to the correct format
        .map(variable => {
          const [name] = Object.keys(variable);
          return {
            name,
            type: variable[name].type,
            samples: variable[name].samples,
          };
        })
    );
  };
  // alexa skills kit only supports unicode spaces, periods, underscores,
  // possessive apostrophes and hyphens
  const stripUnallowedCharactersFromString = (str: string): string =>
    str.replace(/!|,|_/g, "");
  // replace botmock variable signs with alexa skills kit braces
  const formatUtteranceText = (text_: string): string => {
    const VARIABLE_SIGN = "%";
    let text = text_;
    let numVariableSignsEncountered = 0;
    for (const { char, i } of text.split("").map((c, i) => ({ char: c, i }))) {
      // if this character of the utterance is the reserved variable
      // sign, replace it with the correct alexa skills kit equivalent
      if (char === VARIABLE_SIGN) {
        numVariableSignsEncountered += 1;
        if (numVariableSignsEncountered % 2 !== 0) {
          text = text.substr(0, i) + "{" + text.substr(i + 1);
        } else {
          text = text.substr(0, i) + "}" + text.substr(i + 1);
        }
      }
    }
    return text;
  };
  // prompts are a mapping of the intent-slot variations + any validations
  const prompts = intents
    .map(getSlotsForIntent)
    .filter(slot => slot.length > 0 && slot[0].samples.length > 0)
    .map((slot: Slot) => {
      const { name } = intents.find(intent =>
        intent.utterances
          .filter(utterance => utterance.variables.length > 0)
          .filter(utterance =>
            utterance.variables.some(variable => variable.name === slot.name)
          )
      );
      return {
        id: `Elicit.Intent-${name}.IntentSlot-${slot.name}`,
        variations: (slot.samples || []).map(sample => ({
          type: "PlainText",
          value: sample,
        })),
      };
    });
  return {
    languageModel: {
      invocationName: stripUnallowedCharactersFromString(project.name),
      // join the default amazon intents with the mapped project intents
      intents: DEFAULT_INTENTS.concat(
        intents.map(intent => ({
          name: intent.name,
          samples: intent.utterances.map(utterance =>
            stripUnallowedCharactersFromString(
              formatUtteranceText(utterance.text)
            )
          ),
          slots: getSlotsForIntent(intent),
        }))
      ),
      types,
    },
    dialog: {
      intents: intents
        .filter(intent =>
          intent.utterances.some(utterance => utterance.variables.length > 0)
        )
        .map(intent => ({
          name: intent.name,
          confirmationRequired: false,
          prompts: {},
          slots: getSlotsForIntent(intent).map(slot => ({
            name: slot.name,
            type: slot.type,
            confirmationRequired: false,
            elicitationRequired: true,
            prompts: {
              elicitation: `Elicit.Intent-${slot.name}.IntentSlot-${slot.name}`,
            },
            // validations: [],
          })),
        })),
      delegationStrategy: "ALWAYS",
    },
    prompts,
  };
}
