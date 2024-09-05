---
layout: page
title:   如何将 Visual Studio Code (VSCode) 设置到文件右键快捷方式
category: 工具
tags: windows
---
{% include JB/setup %} 

Visual Studio Code（VSCode）是一款广受欢迎的代码编辑器。为了方便地使用 VSCode 打开文件或文件夹，我们可以将其添加到 Windows 的右键快捷方式中。本文将详细介绍如何通过几种方法将 VSCode 添加到文件的右键菜单中，并为其设置图标。

## 方法 1：使用 VSCode 内置命令（推荐）

VSCode 提供了一个便捷的方法，可以将 `code` 命令添加到系统路径中，这样你可以直接从命令行或右键菜单中打开文件或文件夹。

### 步骤：

1. **打开 VSCode**。

2. **按下 `Ctrl + Shift + P`** 打开命令面板。

3. 在命令面板中输入并选择 `Shell Command: Install 'code' command in PATH`。

4. 完成后，VSCode 将注册 `code` 命令到系统路径。

5. 现在，你可以在文件夹中右键选择“在终端中打开”，然后使用 `code .` 命令快速打开当前文件夹，或者使用 `code <filename>` 打开特定文件。

## 方法 2：手动修改注册表

如果你希望将 VSCode 直接添加到文件和文件夹的右键菜单中，可以通过修改 Windows 注册表来实现。

### 为文件添加 VSCode 打开选项

1. **打开注册表编辑器**：
   - 按下 `Win + R`，输入 `regedit`，然后按下回车键，打开注册表编辑器。

2. **导航到以下路径**：
   ```plaintext
   HKEY_CLASSES_ROOT\*\shell\
   ```

3. **创建新的右键菜单项**：
   - 右键点击 `shell` 文件夹，选择 `新建` -> `项`，命名为 `Open with VSCode`。
   - 在右侧双击 `(默认)`，将数值数据设置为 `Open with VSCode`。

4. **添加命令项**：
   - 右键点击 `Open with VSCode`，选择 `新建` -> `项`，命名为 `command`。
   - 双击 `command` 下的 `(默认)`，将数值数据设置为 VSCode 的路径：
   ```plaintext
   "C:\Users\admin\scoop\apps\vscode\current\Code.exe" "%1"
   ```
   - `%1` 代表当前右键点击的文件路径。

### 为文件夹添加 VSCode 打开选项

1. **导航到以下路径**：
   ```plaintext
   HKEY_CLASSES_ROOT\Directory\shell\
   ```

2. **创建新的右键菜单项**：
   - 按照上面的方法，为文件夹创建一个名为 `Open with VSCode` 的项。

3. **添加命令项**：
   - 在 `Open with VSCode` 下新建 `command` 项，并将 `(默认)` 的数值数据设置为：
   ```plaintext
   "C:\Users\admin\scoop\apps\vscode\current\Code.exe" "%V"
   ```
   - `%V` 代表当前右键点击的文件夹路径。

## 为右键菜单项添加图标

为了在右键菜单中显示 VSCode 图标，你可以进一步修改注册表，为刚才创建的 `Open with VSCode` 项添加 `Icon` 键。

1. **导航到 `Open with VSCode` 项**：
   - 无论是文件还是文件夹，找到你刚才创建的 `Open with VSCode` 项。

2. **添加 `Icon` 键**：
   - 右键点击右侧空白区域，选择 `新建` -> `字符串值`，将其命名为 `Icon`。
   - 双击 `Icon`，将数值数据设置为 VSCode 的路径，并加上图标索引：
   ```plaintext
   C:\Users\admin\scoop\apps\vscode\current\Code.exe,0
   ```
   - `,0` 表示使用 VSCode 程序中的第一个图标资源。

## 总结

通过上述方法，你可以轻松地将 VSCode 添加到 Windows 的右键菜单中，不仅可以提高工作效率，还能让你的右键菜单更加直观。如果你更喜欢使用命令行，也可以使用 VSCode 自带的命令将其添加到系统路径中。