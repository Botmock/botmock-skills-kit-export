import { execSync } from "child_process";
import { join } from "path";
import fs from "fs";
import * as lib from "../lib";

test("can read from output directory after `npm start`", () => {
  const stdout = execSync("npm start");
  expect.assertions(2);
  expect(Buffer.from(stdout).length).toBe(147);
  expect(async () => {
    await fs.promises.access(join(process.cwd(), "output"));
  }).not.toThrow();
});

test("produces interaction model from project data", () => {
  expect(() => {
    lib.mapProjectDataToInteractionModel([]);
  }).toThrow();
});

test.todo("creates directory named from provided command line flag");
