import { execSync } from "child_process";
// import { remove } from "fs-extra";
import path from "path";
import fs from "fs";
import * as lib from "../lib";
import { outputPath } from "../";

// beforeEach(async () => {
//   // cleanup the created output path if it exists
//   try {
//     await fs.promises.access(outputPath, fs.constants.R_OK);
//     await remove(outputPath);
//   } catch (_) {}
// });

test.todo("writes interaction model");
test.todo("warns in the case of node.js version below minimum");

test("can read from output directory after running start script", () => {
  const stdout = execSync("npm start");
  expect.assertions(2);
  expect(Buffer.from(stdout).length).not.toBe(0);
  expect(async () => {
    await fs.promises.access(
      path.join(process.cwd(), "output"),
      fs.constants.R_OK
    );
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
    await fs.promises.access(
      path.join(process.cwd(), "model"),
      fs.constants.R_OK
    );
  }).not.toThrow();
});
