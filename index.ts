import fs from "fs";
import { join } from "path";
import { config } from "dotenv";
import {
  ErrorHandler,
  HandlerInput,
  RequestHandler,
  SkillBuilders,
} from "ask-sdk-core";
import { Response, SessionEndedRequest } from "ask-sdk-model";
import { getProjectData, mapProjectDataToInteractionModel } from "./lib";

config();

export type ProjectResponse = {
  errors?: { error: string }[];
  data: any[];
};

try {
  (async () => {
    const project: ProjectResponse = await getProjectData({
      projectId: process.env.BOTMOCK_PROJECT_ID,
      boardId: process.env.BOTMOCK_BOARD_ID,
      teamId: process.env.BOTMOCK_TEAM_ID,
      token: process.env.BOTMOCK_TOKEN,
    });
    for (const { error } of project.errors) {
      throw new Error(error);
    }
    console.log(project.data);
    const outputPath = join(__dirname, process.argv[2] || "output");
    await fs.promises.mkdir(outputPath);
    await fs.promises.writeFile(`${outputPath}/en-US.json`, JSON.stringify({}));
  })();
} catch (err) {
  console.error(err);
  process.exit(1);
}
