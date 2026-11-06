import React from 'react';
import {registerRoot, Composition} from 'remotion';
import {Video, Cover} from './Video';
import {FPS, HEIGHT, WIDTH, Job, durationOf} from './core';
import jobJson from './props.generated.json';

const job = jobJson as unknown as Job;

const Root: React.FC = () => (
  <>
    <Composition id="Reel" component={Video as any} durationInFrames={durationOf(job.timing)} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{job}}
      calculateMetadata={({props}: any) => ({durationInFrames: durationOf(props.job.timing)})} />
    <Composition id="Cover" component={Cover as any} durationInFrames={1} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{job}} />
  </>
);
registerRoot(Root);
