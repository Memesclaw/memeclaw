export * from './registry';
export * from './loader';
export * from './tokenomics';
export * from './bonding-curve';
export * from './four-meme';
export * from './skill-learner';

// 导入技能以自动注册
import './tokenomics';
import './bonding-curve';
import './four-meme';
import './skill-learner';
