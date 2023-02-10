"use strict";

import * as vscode from "vscode";
import fs = require("fs");

interface FileStat {
  name: string;
  modified: number;
}

function getFullPath(relativePath: string) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return "";
  }
  return workspaceFolder.uri.fsPath + "/" + relativePath;
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "remls.openLatestLog",
    function () {
      const config = vscode.workspace.getConfiguration("laravelLogViewer");
      const isLaravelProject = config.get("isLaravelProject") as boolean;
      if (!isLaravelProject) {
        return;
      }
      const logPath = config.get("logPath") as string;
      if (!logPath) {
        vscode.window.showErrorMessage("No log path set in config");
        return;
      }
      const fullPath = getFullPath(logPath);
      if (!fs.existsSync(fullPath)) {
        vscode.window.showErrorMessage("Log path does not exist: " + fullPath);
        return;
      }

      // Get last edited file in log directory
      let fileStats: FileStat[] = [];
      fs.readdirSync(fullPath).forEach((file) => {
        const filePath = fullPath + "/" + file;
        fileStats.push({
          name: filePath,
          modified: fs.statSync(filePath).mtimeMs,
        });
      });
      if (fileStats.length === 0) {
        vscode.window.showErrorMessage("No log files found");
        return;
      }

      fileStats.sort((a, b) => b.modified - a.modified);

      // Open file in editor
      const latestLogFile = fileStats[0].name;
      vscode.workspace.openTextDocument(latestLogFile).then((doc) => {
        // Get last line that starts with the pattern [timestamp]
        const pattern = /^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/;
        let lineNumber = 0;
        for (let i = doc.lineCount - 1; i >= 0; i--) {
          const line = doc.lineAt(i);
          if (pattern.test(line.text)) {
            lineNumber = i;
            break;
          }
        }

        // Open file and scroll to that line
        vscode.window.showTextDocument(doc).then((editor) => {
          const range = new vscode.Range(
            new vscode.Position(lineNumber, 0),
            new vscode.Position(lineNumber, 21) // 21 is the length of the timestamp
          );
          editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
          editor.selection = new vscode.Selection(range.start, range.end);
        });
      });
    }
  );
}

export function deactivate() {}
