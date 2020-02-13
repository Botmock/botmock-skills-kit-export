export enum DelegationStrategies {
  ALWAYS = "ALWAYS",
  SKILL_RESPONSE = "SKILL_RESPONSE",
}

export type ObjectLike<T> = { [resourceName: string]: T; };

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

export namespace Botmock {
  export type Slot = {
    samples: string[];
  };
  export type Entity = any;
  export type Intent = any;
  export type Utterance = any;
}
