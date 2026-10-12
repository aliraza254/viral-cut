export interface SampleVideo {
  id: string;
  title: string;
  creator: string;
  category: string;
  youtubeUrl: string;
  videoId: string;
  summary: string;
  transcript: string;
}

export const SAMPLE_VIDEOS: SampleVideo[] = [
  {
    id: 'hormozi-offer',
    title: 'How to Charge 10x More for the Exact Same Thing',
    creator: 'Alex Hormozi',
    category: 'Business & Psychology',
    youtubeUrl: 'https://www.youtube.com/watch?v=k5q8R6xM4gY',
    videoId: 'k5q8R6xM4gY',
    summary: 'The value equation breakdown: dream outcome, perceived likelihood of achievement, time delay, and effort/sacrifice.',
    transcript: `[00:00] Most people think that to charge 10 times more for their service or product, they have to work 10 times harder or build something 10 times bigger. That is completely false.
[00:14] Let me give you an example. If you sell a generic 30-day diet plan for fifty dollars, you're competing with a million people on Google. You have zero pricing power.
[00:32] But what happens if you change the offer? Instead of saying "here is a PDF diet", you say: "I will fly to your kitchen, throw away all the junk food, order your pre-cooked meals for the next 30 days, and guarantee you drop 10 pounds or I pay you five thousand dollars."
[00:54] Did the biological calories change? No. The nutrition didn't change at all. What changed was the perceived likelihood of achievement and the effort and sacrifice required by the client.
[01:12] You collapsed the friction to zero. That is why someone will happily pay you five thousand dollars instead of fifty dollars for the exact same underlying biological result.
[01:30] Stop selling the process. Sell the guarantee of the dream outcome with zero effort required from their side. That's the secret to charging whatever you want.`,
  },
  {
    id: 'mrbeast-retention',
    title: 'The Secret Algorithm Formula: Why 99% Fail in 3 Seconds',
    creator: 'Jimmy Donaldson (MrBeast)',
    category: 'Viral Creator Formula',
    youtubeUrl: 'https://www.youtube.com/watch?v=0e3GPea1Tyg',
    videoId: '0e3GPea1Tyg',
    summary: 'How fast pacing, visual confirmation of the title in the first frame, and micro-cliffhangers drive 100M+ views.',
    transcript: `[00:00] If you look at YouTube retention graphs, the single biggest drop-off always happens in the first three to five seconds. Over seventy percent of people click away before you even finish your sentence.
[00:15] Why? Because you lied to them or made them wait.
[00:23] When someone clicks a title that says "I Survived 50 Hours In A Desert", in the very first second they need to see sand, extreme heat, and an immediate ticking clock.
[00:40] Never say "Hey guys, welcome back to the channel, today we're gonna do something crazy." That immediately destroys momentum. You have to start right in the middle of the action with an unresolved question.
[00:58] And every ten to fifteen seconds, there has to be a micro-rehook. A new obstacle, a sound effect spike, a sudden twist. If the viewer feels like they know what's going to happen next, they swipe away.
[01:15] Keep them on the edge of anticipation until the final frame.`,
  },
  {
    id: 'huberman-dopamine',
    title: 'How 5 Minutes of Morning Light Completely Resets Your Brain',
    creator: 'Dr. Andrew Huberman',
    category: 'Neuroscience & Health',
    youtubeUrl: 'https://www.youtube.com/watch?v=gXDMoiEkyuQ',
    videoId: 'gXDMoiEkyuQ',
    summary: 'The melanopsin retinal ganglion cell trigger that sets circadian cortisol and night-time melatonin spikes.',
    transcript: `[00:00] If you do only one thing for your mental focus, mood, and sleep this year, let it be viewing natural sunlight within 30 to 60 minutes of waking.
[00:16] Inside your eyes, you have specialized neural cells called intrinsically photosensitive retinal ganglion cells. They don't form images. Their only job is to detect the angle and photons of morning blue-yellow contrast.
[00:35] When light strikes them, they send a direct electrical projection to your suprachiasmatic nucleus. That triggers a healthy morning cortisol surge, which increases alertness, focus, and dopamine baseline.
[00:55] Even more importantly, it starts a biological timer in your brain that dictates when melatonin will be released 16 hours later for deep restorative sleep.
[01:12] Don't do this through a window or sunglasses. Glass filters out the relevant wavelengths by a factor of fifty. Step outside on your porch for just five to ten minutes. It is the single most powerful free biohack known to neuroscience.`,
  },
  {
    id: 'ai-future-skills',
    title: 'The Only Human Skill AI Will Not Replace in the Next 5 Years',
    creator: 'Tech Strategy Breakdown',
    category: 'Technology & AI',
    youtubeUrl: 'https://www.youtube.com/watch?v=2r1o5e7q8k0',
    videoId: '2r1o5e7q8k0',
    summary: 'Why technical execution is becoming a commodity, and taste, curation, and problem-definition are exploding in value.',
    transcript: `[00:00] Everyone is terrified that artificial intelligence is going to replace coders, writers, and digital artists. But if you study every major technological revolution from the steam engine to the internet, you notice a strange paradox.
[00:18] When the cost of producing something drops to zero, the value doesn't disappear. It shifts.
[00:29] When synthesizers were invented, people said musicians would be obsolete. Instead, it created hip hop and electronic music, and the people with superior taste became billionaires.
[00:45] Right now, generating ten thousand lines of code or twenty marketing graphics takes 30 seconds. So what is the scarce resource? It's not execution. It's judgment.
[01:02] Knowing WHICH problem is actually worth solving. Having the taste to curate what is exceptional versus mediocre slop. The people who win in the next five years aren't the prompt engineers; they are the people with high taste and radical domain discernment.`,
  },
  {
    id: 'naval-leverage',
    title: 'How to Get Unreasonably Rich Without Getting Lucky',
    creator: 'Naval Ravikant',
    category: 'Philosophy & Wealth',
    youtubeUrl: 'https://www.youtube.com/watch?v=1-TZqOsVCN8',
    videoId: '1-TZqOsVCN8',
    summary: 'Permissionless leverage through code, media, and specific knowledge.',
    transcript: `[00:00] You are not going to get rich renting out your time. If you get paid by the hour, your inputs and outputs are strictly linear, and your upside is capped by your physical biological limits.
[00:18] You must own equity or a piece of a business to gain financial freedom.
[00:26] The modern world offers a brand new form of leverage that humanity has never seen before: permissionless leverage. That is code and media.
[00:42] When you write software or record a video, you can replicate it an infinite number of times while you sleep, with zero marginal cost of reproduction.
[00:58] Combine permissionless leverage with specific knowledge—the things you were naturally obsessed with between ages 12 and 18 that you couldn't be trained in—and you will become irreplaceable.`,
  },
];

import { ReelScript } from '../types';

export const DEFAULT_SAMPLE_REEL: ReelScript = {
  id: 'sample-reel-hormozi',
  title: 'How to Charge 10x More for the Exact Same Thing',
  hookType: 'Contrarian Value Paradox',
  startingPunchline: 'You are losing 90% of your revenue by selling the process instead of collapsing the friction.',
  closingPunchline: 'Stop selling the process. Sell the zero-effort guarantee.',
  estimatedDuration: '32s',
  viralityScore: 94,
  whyItWillBlowUp: [
    'Violates standard business intuition in the first 2 seconds',
    'Uses extreme contrast ($50 vs $5,000) to maintain high retention dopamine',
    'Seamless loop closing sentence connects back to the opening statement',
  ],
  soundBiteQuote: 'People will happily pay you $5,000 to eliminate friction.',
  hashtags: ['#business', '#alexhormozi', '#pricingstrategy', '#marketingsecrets', '#viralreels'],
  retentionGraph: [
    { second: 0, retentionPct: 100 },
    { second: 3, retentionPct: 92 },
    { second: 8, retentionPct: 88 },
    { second: 15, retentionPct: 84 },
    { second: 22, retentionPct: 81 },
    { second: 30, retentionPct: 78 },
  ],
  segments: [
    {
      timecode: '00:00 - 00:04',
      startSec: 0,
      endSec: 4,
      spokenScript: 'Most people think charging 10 times more means working 10 times harder. That is completely false.',
      visualCue: 'Extreme close-up punch-in, direct eye contact with high-contrast text animation.',
      onScreenText: 'CHARGING 10X MORE',
      soundEffect: 'Whoosh whip hit',
      bRollKeywords: ['money stack', 'overworked clock', 'contrast'],
    },
    {
      timecode: '00:04 - 00:10',
      startSec: 4,
      endSec: 10,
      spokenScript: 'If you sell a generic 30-day PDF diet for $50, you have zero pricing power against Google.',
      visualCue: 'Split screen: boring PDF file icon with red cross, phone swiping away.',
      onScreenText: '$50 PDF = ZERO VALUE',
      soundEffect: 'Glitch buzz',
      bRollKeywords: ['pdf document', 'bored phone scroll'],
    },
    {
      timecode: '00:10 - 00:18',
      startSec: 10,
      endSec: 18,
      spokenScript: 'Now what if you say: I fly to your kitchen, throw out the junk, deliver fresh meals daily, or pay you $5,000?',
      visualCue: 'Fast montage cut: refrigerator opened, fresh chef gourmet meals stacked on marble counter.',
      onScreenText: '$5,000 GUARANTEE',
      soundEffect: 'Cash register ding',
      bRollKeywords: ['luxury kitchen', 'meal prep container', 'handshake'],
    },
    {
      timecode: '00:18 - 00:25',
      startSec: 18,
      endSec: 25,
      spokenScript: 'Did the calories change? No. What changed was perceived effort and sacrifice collapsed to zero.',
      visualCue: 'Kinetic word zoom with downward slope arrow animation.',
      onScreenText: 'COLLAPSE EFFORT TO ZERO',
      soundEffect: 'Sub bass drop',
      bRollKeywords: ['brain scan neural', 'satisfying slider'],
    },
    {
      timecode: '00:25 - 00:32',
      startSec: 25,
      endSec: 32,
      spokenScript: 'Stop selling the process. Sell the zero-effort guarantee. That is how you charge 10x more.',
      visualCue: 'Punch out to medium shot, confident nod, loop back seamlessly into opening frame.',
      onScreenText: 'SELL THE GUARANTEE',
      soundEffect: 'Pop risers',
      bRollKeywords: ['cinematic studio', 'infinite loop transition'],
    },
  ],
};

