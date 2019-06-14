import {
  ErrorHandler,
  HandlerInput,
  RequestHandler,
  SkillBuilders,
} from "ask-sdk-core";
import { Response, SessionEndedRequest } from "ask-sdk-model";
import { getProjectData } from "./lib";
// import * as templates from "./templates";

type ProjectResponse = {
  errors?: { error: string }[];
  data: any[];
};

try {
  (async () => {
    const project: ProjectResponse = await getProjectData({
      projectId: process.env.BOTMOCK_PROJECT_ID,
      boardId: process.env.BOTMOCK_BOARD_ID,
      teamId: process.env.BOTMOCK_TEAMID,
      token: process.env.BOTMOCK_TOKEN,
    });
    for (const { error } of project.errors) {
      throw new Error(error);
    }
    console.log(project.data);
  })();
} catch (err) {
  console.error(err);
  process.exit(1);
}
