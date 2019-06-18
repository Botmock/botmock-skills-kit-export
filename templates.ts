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
  languageModel: {
    invocationName: "",
    intents: DEFAULT_INTENTS,
    types: [],
  },
  dialog: {},
  prompts: [],
};
