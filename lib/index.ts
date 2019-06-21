// import { createIntentMap } from "@botmock-api/utils";
import fetch from "node-fetch";
import { ProjectResponse } from "../";
import { DEFAULT_INTENTS } from "../templates";

type DialogIntent = {
  configurationRequired?: boolean;
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
      return res.hasOwnProperty("board") ? res.board : res;
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
  const [intents, entities, , project] = data;
  const types = entities.map(entity => ({
    name: entity.name,
    values: entity.data.map(({ value }) => ({ name: { value } })),
  }));
  return {
    dialog: {
      intents: [],
    },
    languageModel: {
      invocationName: project.name,
      // join the default amazon intents with the project intents
      intents: DEFAULT_INTENTS.concat(
        intents.map(intent => ({
          name: intent.name,
          samples: intent.utterances.map(utterance => utterance.text),
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
