import { Song } from "../types";

export function getSongFromId(id: string, songs: Song[]) {
  return songs.filter((song) => song.id === id)?.[0] || undefined;
}
