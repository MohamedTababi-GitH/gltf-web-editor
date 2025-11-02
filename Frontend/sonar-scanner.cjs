const scanner = require("sonarqube-scanner").default;

scanner(
  {
    serverUrl: "http://localhost:9000",
    token: process.env.SONAR_TOKEN,
    options: {
      "sonar.projectKey": "react-frontend",
      "sonar.projectName": "ECAD Frontend",
      "sonar.sources": "src",
      "sonar.tests": "src",
      "sonar.test.inclusions":
        "**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx",
      "sonar.javascript.lcov.reportPaths": "coverage/lcov.info",
      "sonar.exclusions": "**/node_modules/**,build/**",
    },
  },
  () => process.exit()
);
