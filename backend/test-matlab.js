const path = require("path");

const { runRetinaSafe } =
  require("./services/matlabService");

const imagePath =
  "D:\\Document\\SIH MATLAB PROJECT\\00836aaacf06.png";

runRetinaSafe(imagePath)
  .then((result) => {

    console.log("\n============================================");
    console.log("MATLAB TEST SUCCESS");
    console.log("============================================");

    console.log(
      "MATLAB exit code:",
      result.exitCode
    );

  })
  .catch((error) => {

    console.error("\n============================================");
    console.error("MATLAB TEST FAILED");
    console.error("============================================");

    console.error(error.message);

    process.exitCode = 1;
  });