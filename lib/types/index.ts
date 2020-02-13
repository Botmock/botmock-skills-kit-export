export enum DelegationStrategies {
  ALWAYS = "ALWAYS",
  SKILL_RESPONSE = "SKILL_RESPONSE",
}

export type ObjectLike<T> = { [resourceName: string]: T; };

export namespace SkillsKit {
  export enum VariationTypes {
    PLAIN = "PlainText",
  }
  export type Prompt = {
    id: string;
    variations: { type: string; value: string; }[];
  };
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
    id: string;
    variable_id: string;
    is_required: boolean;
    prompt: string;
  };
  export type Entity = any;
  export type Intent = any;
  export type Utterance = any;
}
