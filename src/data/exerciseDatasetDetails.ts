import generated from './exerciseDatasetDetails.generated.json';

export interface ExerciseDatasetDetail {
  externalId: string;
  sourceName: string;
  instructionsEs: string;
  instructionsEn: string;
  matchScore: number;
}

interface GeneratedDatasetDetails {
  source: {
    repository: string;
    commit: string;
    license: string;
    mediaIncluded: boolean;
    mediaWarning: string;
  };
  exercises: Record<string, ExerciseDatasetDetail>;
}

const details = generated as GeneratedDatasetDetails;

export const EXERCISE_DATASET_SOURCE = details.source;

export function exerciseDatasetDetail(
  localExerciseId: string,
): ExerciseDatasetDetail | undefined {
  return details.exercises[localExerciseId];
}
