import React from 'react';
import {Composition} from 'remotion';
import {Story, FPS, TOTAL_SECONDS} from './Story';

export const Root: React.FC = () => (
  <Composition id="Story" component={Story} durationInFrames={TOTAL_SECONDS * FPS} fps={FPS} width={1920} height={1080} />
);
