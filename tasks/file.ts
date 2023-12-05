import { readFile } from "fs";

export const readJsonIfExists = async <T>(
  path: string,
): Promise<T | undefined> => {
  try {
    return await readJson<T>(path);
  } catch (e) {}
};
export const readJson = async <T>(path: string) => {
  return await new Promise<T>((resolve, reject) => {
    readFile(path, "utf-8", (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      if (!data) {
        resolve({} as T);
        return;
      }
      resolve(JSON.parse(data));
    });
  });
};
