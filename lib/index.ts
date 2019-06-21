import { createIntentMap } from "@botmock-api/utils";
import fetch from "node-fetch";
import { ProjectResponse } from "../";
import { DEFAULT_INTENTS } from "../templates";

type DialogIntent = {
  confirmationRequired?: boolean;
  name: string;
  samples: string[];
  slots?: {
    name: string;
    type?: string;
    elicitationRequired?: boolean;
    confirmationRequired?: boolean;
    prompts?: { elicitation: string };
    samples?: string[];
  }[];
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

interface ProjectVariables {
  projectId?: string;
  boardId?: string;
  teamId?: string;
  token: string;
}

const BOTMOCK_API_URL = "https://app.botmock.com/api";

export async function getProjectData(projectVariables: ProjectVariables) {
  const { projectId, boardId, teamId, token } = projectVariables;
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

export function mapProjectDataToInteractionModel(
  data: any[]
): InteractionModel {
  const VARIABLE_SIGN = "%";
  const [intents, entities, messages, project] = data;
  const types = entities.map(entity => ({
    name: entity.name,
    values: entity.data.map(({ value }) => ({ name: { value } })),
  }));
  return {
    dialog: {
      delegationStrategy: "ALWAYS",
      intents: intents.map(intent => ({ name: intent.name })),
    },
    prompts: [],
    languageModel: {
      invocationName: project.name,
      // join the default amazon intents with the mapped project intents
      intents: DEFAULT_INTENTS.concat(
        intents.map(intent => ({
          name: intent.name,
          samples: intent.utterances.map(utterance => {
            let text = utterance.text;
            let numVariableSignsEncountered = 0;
            for (const { char, i } of text
              .split("")
              .map((c, i) => ({ char: c, i }))) {
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
          }),
          // define slots as a map of each unique variable appearing in the
          // utterances for this intent
          slots: intent.utterances
            .filter(utterance => utterance.variables.length > 0)
            .reduce((acc, utterance) => {
              return [
                ...acc,
                // ...utterance.variables.reduce((acc_, variable) => {
                //   // const { name: type = "" } =
                //   //   entities.find(entity => entity.id === variable.entity) || {};
                //   return acc_;
                // }, {}),
              ];
            }, []),
        }))
      ),
      types,
    },
  };
}
