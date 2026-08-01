import type { ImageSourcePropType } from 'react-native';
import type { RankId } from './tokens';

/**
 * Custom rank emblem artwork (LoL-style crests), bundled per rank id.
 * React Native's static asset bundling requires literal `require()` calls — a
 * dynamic `require('./ranks/' + id)` won't resolve, so the map is spelled out.
 *
 * The files in `assets/ranks/<id>.png` contain the final progressive crest set.
 * Replacing artwork later with the same filenames requires no code change.
 */
export const RANK_IMAGES: Record<RankId, ImageSourcePropType> = {
  rookie: require('../../assets/ranks/rookie.png'),
  bronze: require('../../assets/ranks/bronze.png'),
  silver: require('../../assets/ranks/silver.png'),
  gold: require('../../assets/ranks/gold.png'),
  platinum: require('../../assets/ranks/platinum.png'),
  diamond: require('../../assets/ranks/diamond.png'),
  elite: require('../../assets/ranks/elite.png'),
  titan: require('../../assets/ranks/titan.png'),
  olympus: require('../../assets/ranks/olympus.png'),
};
