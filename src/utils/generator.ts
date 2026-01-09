import { TimelineBlock } from '../types';

// Voice generation is completely disabled
export const clearSpeechQueue = async () => {
    // No-op
};

export async function preGenerateTimelineAudio(timeline: TimelineBlock[]) {
    // No-op
}

export const speak = (text: string) => {
    // No-op - logging removed to keep console clean
};
