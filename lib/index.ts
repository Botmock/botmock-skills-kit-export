import fetch from "node-fetch";
import { ProjectResponse } from "../";
// import * as templates from "./templates";

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
    ["intents", `boards/${boardId}`].map(async path => {
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

export async function mapProjectDataToInteractionModel(
  data: Partial<ProjectResponse>
) {
  return {};
}
