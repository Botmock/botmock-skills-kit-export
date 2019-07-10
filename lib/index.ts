import uuid from "uuid/v4";
import { ProjectResponse } from "../";
import { DEFAULT_INTENTS } from "../templates";
export { default as getProjectData } from "./client";

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
  name: string;
  samples: string[];
  delegationStrategy?: string;
  elicitationRequired?: boolean;
  confirmationRequired?: boolean;
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

type ProjectPayload = Readonly<any[]>;

type Intent = Partial<{
  utterances?: { text: string; variables: any[] }[];
}>;

export function mapProjectDataToInteractionModel(
  data: ProjectPayload
): InteractionModel {
  const [intents, entities, , project] = data;
  // define types as a map of entities
  const types = entities.map(entity => ({
    name: entity.name,
    values: entity.data.map(({ value }) => ({ name: { value } })),
  }));
  // define slots as a map of each unique variable appearing in the
  // utterances for this intent
  const getSlotsForIntent = (intent: Intent): Slots => {
    const uniqueSlots = intent.utterances
      .filter(utterance => utterance.variables.length > 0)
      .reduce(
        (acc, utterance) => ({
          ...acc,
          ...utterance.variables.reduce((acc_, variable) => {
            return {
              ...acc_,
              // reduce on dynamic key names for sake of uniqueness
              [variable.name.replace(/%/g, "")]: {
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
        }),
        {}
      );
    return (
      Object.keys(uniqueSlots)
        // map the unique variables back to the correct format
        .map(name => {
          const { type, samples } = uniqueSlots[name];
          return {
            name,
            type,
            samples,
          };
        })
    );
  };
  // correctly format a string to prevent build errors
  const stripUnallowedCharactersFromString = (str: string): string => {
    return str
      .replace(/!|,|_|alexa/gi, "")
      .toLowerCase()
      .trim();
  };
  // replace botmock variable signs with alexa skills kit braces
  const formatUtteranceText = (text_: string): string => {
    const BOTMOCK_VARIABLE_SIGN = "%";
    let text = text_;
    let numVariableSignsEncountered = 0;
    for (const { char, i } of text.split("").map((c, i) => ({ char: c, i }))) {
      // if this character of the utterance is the reserved variable
      // sign, replace it with the correct alexa skills kit equivalent
      if (char === BOTMOCK_VARIABLE_SIGN) {
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
  const prompts = intents
    .map(getSlotsForIntent)
    .filter(slot => slot.length > 0 && slot[0].samples.length > 0)
    .map((slotsWithSamples: Slot[]) => {
      const [slot] = slotsWithSamples;
      return {
        id: `Elicit.Slot.${uuid()}`,
        variations: slot.samples.map(sample => ({
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
      delegationStrategy: "SKILL_RESPONSE",
      intents: intents
        .filter(intent =>
          intent.utterances.some(utterance => utterance.variables.length > 0)
        )
        .map(intent => ({
          name: intent.name,
          delegationStrategy: "ALWAYS",
          confirmationRequired: false,
          elicitationRequired: true,
          prompts: {},
          slots: getSlotsForIntent(intent).map(slot => ({
            name: slot.name,
            type: slot.type,
            confirmationRequired: false,
            elicitationRequired: true,
            // reduce over the prompt that contains an utterance of this slot
            prompts:
              (
                prompts.filter(prompt => {
                  return prompt.variations
                    .map(variation => variation.value)
                    .some(
                      variation =>
                        typeof variation === "string" &&
                        variation.includes(`{${slot.name}}`)
                    );
                }) || []
              ).reduce((acc, prompt) => {
                return { ...acc, elicitation: prompt.id };
              }, {}) || {},
          })),
        })),
    },
    prompts,
  };
}
