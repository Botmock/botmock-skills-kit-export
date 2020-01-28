import uuid from "uuid/v4";
import { symmetricWrap } from "@botmock-api/utils";
import { DEFAULT_INTENTS } from "../templates";

enum DelegationStrategies {
  ALWAYS = "ALWAYS",
  SKILL_RESPONSE = "SKILL_RESPONSE",
}

type InteractionModel = {
  languageModel: {
    invocationName: string;
    intents?: any[];
    types?: { values: { name: { value: string; synonyms: string[]; }; }[]; }[];
  };
  dialog?: {
    delegationStrategy?: string;
    intents: any[];
  };
  prompts?: any;
};

export function mapProjectDataToInteractionModel(data: any): InteractionModel {
  const { intents, entities, project } = data;
  const types = entities.map(entity => ({
    name: entity.name,
    values: entity.data.map(({ value }) => ({ name: { value } })),
  }));
  // define slots as a map of each unique variable appearing in the utterances for this intent
  const getSlotsForIntent = (intent: any): any[] => {
    const uniqueSlots = intent.utterances
      .filter(utterance => utterance.variables.length > 0)
      .reduce(
        (acc, utterance) => ({
          ...acc,
          ...utterance.variables.reduce((acc_, variable) => {
            const entity = entities.find(entity => entity.id === variable.entity);
            if (typeof entity === "undefined") {
              return acc_;
            }
            return {
              ...acc_,
              // reduce on dynamic key names for sake of uniqueness
              [variable.name.replace(/%/g, "")]: {
                type: entity.name,
                samples: intent.utterances
                  .filter(
                    utterance =>
                      utterance.variables.length > 0 &&
                      utterance.variables.some(({ name }) => variable.name)
                  )
                  .map(utterance => symmetricWrap(utterance.text, { l: "{", r: "}" })),
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
  const stripUnallowedCharactersFromString = (str: string): string =>
    str
      .replace(/!|,|_|alexa/gi, "")
      .toLowerCase()
      .trim();
  const prompts = intents
    .map(getSlotsForIntent)
    .filter(slot => slot.length > 0 && slot[0].samples.length > 0)
    .map((slotsWithSamples: any[]) => {
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
              symmetricWrap(utterance.text, { l: "{", r: "}" })
            )
          ),
          slots: getSlotsForIntent(intent),
        }))
      ),
      types,
    },
    dialog: {
      delegationStrategy: DelegationStrategies.SKILL_RESPONSE,
      intents: intents
        .filter(intent =>
          intent.utterances.some(utterance => utterance.variables.length > 0)
        )
        .map(intent => ({
          name: intent.name,
          delegationStrategy: DelegationStrategies.ALWAYS,
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
