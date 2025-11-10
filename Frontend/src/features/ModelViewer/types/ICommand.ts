export type ICommand = {
  execute(): void;
  undo(): void;
};
