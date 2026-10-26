import part01 from './runtimePart01';
import part02 from './runtimePart02';
import part03 from './runtimePart03';
import part04 from './runtimePart04';
import part05 from './runtimePart05';
import part06 from './runtimePart06';

export const HUB_MASTER_TEXTURE_KEY = 'hub-master-approved';
export const HUB_MASTER_WIDTH = 960;
export const HUB_MASTER_HEIGHT = 540;
export const HUB_MASTER_ORIGINAL_WIDTH = 1672;
export const HUB_MASTER_ORIGINAL_HEIGHT = 941;
export const HUB_MASTER_ORIGINAL_SHA256 =
  '3efc212bdcd7eaaacac119d20cbd89f83ab62d3d9761aafd5abdacae5660a340';

const encoded = [part01, part02, part03, part04, part05, part06].join('');

export const HUB_MASTER_RUNTIME_DATA_URI = `data:image/webp;base64,${encoded}`;
