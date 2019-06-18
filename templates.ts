const DEFAULT_INTENTS = [
  {
    name: "AMAZON.CancelIntent",
    samples: [],
  },
  {
    name: "AMAZON.HelpIntent",
    samples: [],
  },
  {
    name: "AMAZON.StopIntent",
    samples: [],
  },
  {
    name: "AMAZON.FallbackIntent",
    samples: [],
  },
];

export const interactionModel = {
  interactionModel: {
    languageModel: {
      invocationName: "",
      intents: DEFAULT_INTENTS,
    },
    dialog: {},
    prompts: [],
  },
};
