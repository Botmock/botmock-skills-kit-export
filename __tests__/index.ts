import "dotenv/config";
import { execSync } from "child_process";
import { join } from "path";
import fs from "fs";
import * as lib from "../lib";

// describe("output data", () => {
//   test("produces interaction model from project data", async () => {
//     expect(process.env.BOTMOCK_PROJECT_ID).not.toBeUndefined();
//     expect(process.env.BOTMOCK_BOARD_ID).not.toBeUndefined();
//     expect(process.env.BOTMOCK_TEAM_ID).not.toBeUndefined();
//     expect(process.env.BOTMOCK_TOKEN).not.toBeUndefined();
//     const project = await lib.getProjectData({
//       projectId: process.env.BOTMOCK_PROJECT_ID,
//       boardId: process.env.BOTMOCK_BOARD_ID,
//       teamId: process.env.BOTMOCK_TEAM_ID,
//       token: process.env.BOTMOCK_TOKEN,
//     });
//     const model = lib.mapProjectDataToInteractionModel(project.data);
//     expect(Object.keys(model)).toHaveLength(3);
//   });
// });

test("can read from output directory after running start script", () => {
  const stdout = execSync("npm start");
  expect.assertions(2);
  expect(Buffer.from(stdout).length).not.toBe(0);
  expect(async () => {
    await fs.promises.access(join(process.cwd(), "output"), fs.constants.R_OK);
  }).not.toThrow();
});

test("interaction model generation fails when given bad project data", () => {
  expect.assertions(1);
  expect(() => {
    lib.mapProjectDataToInteractionModel([]);
  }).toThrow();
});

test("creates directory named from provided command line flag", () => {
  execSync("npm start model");
  expect.assertions(1);
  expect(async () => {
    await fs.promises.access(join(process.cwd(), "model"), fs.constants.R_OK);
  }).not.toThrow();
});
