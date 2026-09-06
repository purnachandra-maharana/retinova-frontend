const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const MATLAB_EXE = "E:\\Matlab\\bin\\matlab.exe";

const MATLAB_PROJECT =
  "D:\\Document\\SIH MATLAB PROJECT\\SIH26038_NEW";

const MATLAB_SCRIPTS =
  path.join(MATLAB_PROJECT, "scripts");

/**
 * Run the RetinaSafe MATLAB pipeline.
 *
 * @param {string} imagePath - Absolute path to the fundus image.
 * @returns {Promise<object>} MATLAB execution result.
 */
function runRetinaSafe(imagePath) {
  return new Promise((resolve, reject) => {

    if (!imagePath) {
      return reject(
        new Error("MATLAB analysis requires an image path.")
      );
    }

    if (!fs.existsSync(imagePath)) {
      return reject(
        new Error(`Image file does not exist: ${imagePath}`)
      );
    }

    if (!fs.existsSync(MATLAB_EXE)) {
      return reject(
        new Error(`MATLAB executable not found: ${MATLAB_EXE}`)
      );
    }

    const escapedProject =
      MATLAB_PROJECT.replace(/\\/g, "/");

    const escapedScripts =
      MATLAB_SCRIPTS.replace(/\\/g, "/");

    const escapedImage =
      imagePath.replace(/\\/g, "/");

    const matlabCommand =
      `cd('${escapedProject}'); ` +
      `addpath('${escapedScripts}'); ` +
      `result = runRetinaSafe('${escapedImage}');`;

    console.log("\n============================================");
    console.log("Starting MATLAB RetinaSafe Analysis");
    console.log("============================================");
    console.log(`Image: ${imagePath}`);

    const matlabProcess = spawn(
      MATLAB_EXE,
      [
        "-batch",
        matlabCommand
      ],
      {
        windowsHide: true
      }
    );

    let stdout = "";
    let stderr = "";

    matlabProcess.stdout.on("data", (data) => {
      const text = data.toString();

      stdout += text;

      console.log(`[MATLAB] ${text.trim()}`);
    });

    matlabProcess.stderr.on("data", (data) => {
      const text = data.toString();

      stderr += text;

      console.error(`[MATLAB ERROR] ${text.trim()}`);
    });

    matlabProcess.on("error", (error) => {
      reject(
        new Error(
          `Failed to start MATLAB: ${error.message}`
        )
      );
    });

    matlabProcess.on("close", (code) => {

      console.log(
        `MATLAB process exited with code ${code}`
      );

      if (code !== 0) {

        return reject(
          new Error(
            `MATLAB analysis failed.\n\n` +
            `Exit code: ${code}\n\n` +
            `STDOUT:\n${stdout}\n\n` +
            `STDERR:\n${stderr}`
          )
        );
      }

      resolve({
        success: true,
        exitCode: code,
        stdout,
        stderr
      });
    });
  });
}

module.exports = {
  runRetinaSafe
};