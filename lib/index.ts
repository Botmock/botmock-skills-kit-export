import uuid from "uuid/v4";
import { symmetricWrap } from "@botmock-api/utils";
import { DEFAULT_INTENTS } from "../templates";

enum DelegationStrategies {
  ALWAYS = "ALWAYS",
  SKILL_RESPONSE = "SKILL_RESPONSE",
}

type ObjectLike<T> = { [resourceName: string]: T; };

export namespace SkillsKit {
  export type InteractionModel = {
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
}

/**
 * @param data public API response payload
 * @returns an interaction model
 */
export function mapProjectDataToInteractionModel(data: ObjectLike<any>): SkillsKit.InteractionModel {
  const { intents, entities, project } = data;
  // @ts-ignore
  const types = entities.map(entity => ({
    name: entity.name.trim().replace(/\s/g, ""),
    // @ts-ignore
    values: entity.data.map(({ value }) => ({ name: { value } })),
  }));
  // define slots as a map of each unique variable appearing in the utterances for this intent
  const getSlotsForIntent = (intent: any): any[] => {
    const uniqueSlots = intent.utterances
      // @ts-ignore
      .filter(utterance => utterance.variables.length > 0)
      .reduce(
        // @ts-ignore
        (acc, utterance) => ({
          ...acc,
          // @ts-ignore
          ...utterance.variables.reduce((acc_, variable) => {
            // @ts-ignore
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
                    // @ts-ignore
                    utterance =>
                      utterance.variables.length > 0 &&
                      utterance.variables.some((variable: any) => variable.name)
                  )
                  .map((utterance: ObjectLike<any>) => symmetricWrap(utterance.text, { l: "{", r: "}" })),
              },
            };
          }, {}),
        }),
        {}
      );
    return (
      Object.keys(uniqueSlots)
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
      .replace(/!|,|_|-|alexa|\?/gi, "")
      .trim();
  const prompts = intents
    .map(getSlotsForIntent)
    // @ts-ignore
    .filter(slot => slot.length > 0 && slot[0].samples.length > 0)
    .map((slotsWithSamples: any[]) => {
      const [slot] = slotsWithSamples;
      return {
        id: `Elicit.Slot.${uuid()}`,
        // @ts-ignore
        variations: slot.samples.map(sample => ({
          type: "PlainText",
          value: sample,
        })),
      };
    });
  return {
    languageModel: {
      invocationName: stripUnallowedCharactersFromString(project.name).toLowerCase(),
      // join the default amazon intents with the mapped project intents
      intents: DEFAULT_INTENTS.concat(
        // @ts-ignore
        intents.map(intent => ({
          name: intent.name,
          // @ts-ignore
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
        // @ts-ignore
        .filter(intent =>
          // @ts-ignore
          intent.utterances.some(utterance => utterance.variables.length > 0)
        )
        // @ts-ignore
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
                // @ts-ignore
                prompts.filter(prompt => {
                  return prompt.variations
                    // @ts-ignore
                    .map(variation => variation.value)
                    .some(
                      // @ts-ignore
                      variation =>
                        typeof variation === "string" &&
                        variation.includes(`{${slot.name}}`)
                    );
                }) || []
                // @ts-ignore
              ).reduce((acc, prompt) => {
                return { ...acc, elicitation: prompt.id };
              }, {}) || {},
          })),
        })),
    },
    prompts,
  };
}
