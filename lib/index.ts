import fetch from "node-fetch";
// import { createIntentMap } from "@botmock-api/utils";
import { ProjectResponse } from "../";
import { interactionModel } from "../templates";

type DialogIntent = {
  name: string;
  configurationRequired?: boolean;
  slots: {
    name: string;
    type: string;
    elicitationRequired: boolean;
    confirmationRequired: boolean;
    prompts: { elicitation: string };
    samples?: string[];
  }[];
};

type InteractionModel = {
  languageModel: {
    invocationName: string;
    intents?: Partial<DialogIntent>[];
    types?: { values: { name: { value: string; synonyms: string[] } }[] }[];
  };
  dialog: {
    intents: DialogIntent[];
  };
  prompts: { id: string; variations: { type: string; value: string }[] }[];
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
  const [intents, entities, board, project] = data;
  console.log(intents.map(i => i.utterances));
  const dialog = {};
  const prompts = [];
  // console.log(createIntentMap(board.messages, intents));
  interactionModel.languageModel.invocationName = project.name;
  return {
    ...interactionModel,
    dialog: {
      intents: intents.map(intent => ({
        name: intent.name,
        configurationRequired: false,
        slots: [],
      })),
    },
    prompts,
  };
}
