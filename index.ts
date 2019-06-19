import fs from "fs";
import { normalize, basename, join } from "path";
import { config } from "dotenv";
// import {
//   ErrorHandler,
//   HandlerInput,
//   RequestHandler,
//   SkillBuilders,
// } from "ask-sdk-core";
// import { Response, SessionEndedRequest } from "ask-sdk-model";
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
    const outputPath = join(__dirname, normalize(process.argv[2]) || "output");
    // try to read from the output path; if possible, we do not need to create it
    try {
      await fs.promises.access(outputPath, fs.constants.R_OK);
    } catch (_) {
      await fs.promises.mkdir(outputPath);
    }
    const interactionModel = mapProjectDataToInteractionModel(project.data);
    const data = JSON.stringify({ interactionModel });
    await fs.promises.writeFile(`${outputPath}/en-US.json`, data);
    console.log(
      `Completed writing interaction model to /${basename(outputPath)}`
    );
  })();
} catch (err) {
  console.error(err);
  process.exit(1);
}
