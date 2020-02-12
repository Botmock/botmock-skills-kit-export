import "dotenv/config";
import { join } from "path";
import { EOL } from "os";
import { writeJson, remove, mkdirp } from "fs-extra";
import { Batcher } from "@botmock-api/client";
import { default as log } from "@botmock-api/log";
import { mapProjectDataToInteractionModel } from "./lib";

interface Paths {
  readonly outputPath: string;
}

/**
 * Removes and then creates the directories that hold generated files
 * @param paths object containing paths to directories that will hold files
 */
async function recreateOutputDirectories(paths: Paths): Promise<void> {
  const { outputPath } = paths;
  await remove(outputPath);
  await mkdirp(outputPath);
}

async function main(args: string[]): Promise<void> {
  const DEFAULT_OUTPUT = "output";
  let [, , outputDirectory] = args;
  if (typeof outputDirectory === "undefined") {
    outputDirectory = process.env.OUTPUT_DIR || DEFAULT_OUTPUT;
  }
  log("creating output directories");
  await recreateOutputDirectories({ outputPath: outputDirectory, });
  log("fetching project data");
  // @ts-ignore
  const { data: projectData } = await new Batcher({
    token: process.env.BOTMOCK_TOKEN as string,
    teamId: process.env.BOTMOCK_TEAM_ID as string,
    projectId: process.env.BOTMOCK_PROJECT_ID as string,
    boardId: process.env.BOTMOCK_BOARD_ID as string,
  }).batchRequest([
    "project",
    "board",
    "intents",
    "entities",
    "variables"
  ]);
  const interactionModel = mapProjectDataToInteractionModel(projectData);
  await writeJson(join(outputDirectory, "en-US.json"), { interactionModel }, { EOL, spaces: 2 });
  log("done")
}

process.on("unhandledRejection", () => { });
process.on("uncaughtException", () => { });

main(process.argv).catch(async (err: Error) => {
  log(err.stack as string, { isError: true });
  if (process.env.OPT_IN_ERROR_REPORTING) {
  } else {
    const { message, stack } = err;
    await writeJson(join(__dirname, "err.json"), { message, stack }, { EOL, spaces: 2 });
  }
});
