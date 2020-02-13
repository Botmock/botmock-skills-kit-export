import uuid from "uuid/v4";
import { default as log } from "@botmock-api/log";
import { symmetricWrap } from "@botmock-api/utils";
import { DEFAULT_INTENTS } from "../templates";
import {
  SkillsKit,
  Botmock,
  ObjectLike,
  DelegationStrategies,
} from "./types";

/**
 * @param data public API response payload
 * @returns an interaction model
 */
export function mapProjectDataToInteractionModel(data: ObjectLike<any>): SkillsKit.InteractionModel {
  const { intents, entities, project } = data;
  const types = entities.map((entity: Botmock.Entity) => ({
    name: entity.name.trim().replace(/\s/g, ""),
    values: entity.data.map(({ value }: ObjectLike<string>) => ({ name: { value } })),
  }));
  const getSlotsForIntent = (intent: any): ObjectLike<string>[] => {
    const uniqueSlots = (intent.utterances as Botmock.Utterance[])
      .filter(utterance => utterance.variables.length > 0)
      .reduce(
        (acc, utterance) => ({
          ...acc,
          ...utterance.variables.reduce((acc_: ObjectLike<string>, variable: ObjectLike<String>) => {
            const entity = entities.find((entity: Botmock.Entity) => entity.id === variable.entity);
            if (typeof entity === "undefined") {
              log(`
                warning: could not locate entity for variable ${variable.id}
                make sure this variable references a valid entity
              `, { isError: true });
              return acc_;
            }
            return {
              ...acc_,
              [variable.name.replace(/%/g, "")]: {
                type: entity.name,
                samples: intent.utterances
                  .filter(
                    (utterance: Botmock.Utterance) =>
                      utterance.variables.length > 0 &&
                      utterance.variables.some((variable: any) => variable.name)
                  )
                  .map((utterance: ObjectLike<any>) => (
                    symmetricWrap(utterance.text, { l: "{", r: "}" }).replace(/\d+/g, "")
                  )),
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
      .replace(/!|,|_|-|alexa|\d+|\?/gi, "")
      .trim();
  const prompts = intents
    .map(getSlotsForIntent)
    .filter((slot: any) => slot.length > 0 && slot[0].samples.length > 0)
    .map((slotsWithSamples: Botmock.Slot[]) => {
      const [slot] = slotsWithSamples;
      return {
        id: `Elicit.Slot.${uuid()}`,
        variations: slot.samples.map((sample: string) => ({
          type: "PlainText",
          value: sample,
        })),
      };
    });
  return {
    languageModel: {
      invocationName: stripUnallowedCharactersFromString(project.name).toLowerCase(),
      intents: DEFAULT_INTENTS.concat(
        intents.map((intent: any) => ({
          name: intent.name,
          samples: intent.utterances
            .map((utterance: ObjectLike<string>) =>
              stripUnallowedCharactersFromString(
                symmetricWrap(utterance.text, { l: "{", r: "}" })
              )
            )
            .filter((text: string) => text.length > 0),
          slots: getSlotsForIntent(intent),
        }))
      ),
      types,
    },
    dialog: {
      delegationStrategy: DelegationStrategies.SKILL_RESPONSE,
      intents: intents
        .filter((intent: Botmock.Intent) =>
          intent.utterances.some((utterance: Botmock.Utterance) => utterance.variables.length > 0)
        )
        .map((intent: Botmock.Intent) => ({
          name: intent.name,
          delegationStrategy: DelegationStrategies.ALWAYS,
          confirmationRequired: false,
          elicitationRequired: true,
          prompts: {},
          slots: getSlotsForIntent(intent)
            .map(slot => ({
              name: slot.name,
              type: slot.type,
              confirmationRequired: false,
              elicitationRequired: true,
              prompts:
                (
                  prompts
                    .filter((prompt: any) => {
                      return prompt.variations
                        .map((variation: ObjectLike<string>) => variation.value)
                        .some(
                          (variation: string | void) => (
                            typeof variation === "string" &&
                            variation.includes(`{${slot.name}}`)
                          )
                        );
                    }) || []
                )
                  .reduce((acc: ObjectLike<string>, prompt: ObjectLike<string>) => {
                    return {
                      ...acc,
                      elicitation: prompt.id
                    };
                  }, {}) || {},
            })),
        })),
    },
    prompts,
  };
}
