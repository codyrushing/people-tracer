import TracerEngineOptions from './options';
import TracerEngineInputVideo from './input-video';
import { useInferenceEngine } from './inference';

export default function TracerEngine() : JSX.Element {
  useInferenceEngine();
  return <section className="tracer-engine flex flex-col gap-6 mt-6">
    <TracerEngineOptions />
    <TracerEngineInputVideo />
  </section>
};