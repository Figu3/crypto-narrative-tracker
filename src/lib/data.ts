import narrativesJson from '../../data/narratives.json';
import mindshareJson from '../../data/mindshare.json';
import {
  MindshareFileSchema,
  NarrativesFileSchema,
  type MindshareFile,
  type Narrative,
} from './types';

export function loadNarratives(): Narrative[] {
  return NarrativesFileSchema.parse(narrativesJson);
}

export function loadMindshare(): MindshareFile {
  return MindshareFileSchema.parse(mindshareJson);
}
