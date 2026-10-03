/**
 * Live Stream Section Component
 * Promotes live streaming of church services with enhanced design
 *
 * Stream/channel URLs come from site settings (youtube_stream_url,
 * facebook_stream_url, youtube_url, enable_live_stream) — admins set them
 * under Site Settings → Streaming. Section hides when streaming is disabled
 * and no channel URL is configured.
 */

import { Play, Calendar, Clock, Video } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';

const LiveStreamSection = () => {
  const { getSetting } = useSettings();

  const youtubeStreamUrl = getSetting('youtube_stream_url') || '';
  const facebookStreamUrl = getSetting('facebook_stream_url') || '';
  const youtubeChannelUrl = getSetting('youtube_url') || getSetting('social_youtube') || '';
  const liveEnabled = getSetting('enable_live_stream');
  const streamingSchedule = getSetting('streaming_schedule') || '';

  const watchUrl = youtubeStreamUrl || facebookStreamUrl || youtubeChannelUrl;
  const isLiveEnabled = liveEnabled === true || liveEnabled === 'true';

  // Nothing configured at all → don't render an empty promo section.
  if (!watchUrl && !isLiveEnabled) return null;

  return (
    <section id="live-stream" className="py-20 church-gradient text-[var(--color-on-solid)] relative overflow-hidden scroll-mt-20">
      {/* Decorative background */}
      <div className="absolute inset-0 opacity-10" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[var(--color-surface)] rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {isLiveEnabled && (
            <div className="inline-flex items-center gap-2 bg-[color-mix(in_srgb,var(--color-surface)_10%,transparent)] backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <div className="w-2 h-2 bg-[var(--color-error)] rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Live Every Sabbath</span>
            </div>
          )}

          <h2 className="text-4xl md:text-5xl font-bold mb-6">Join Our Live Stream</h2>
          <p className="text-xl text-[var(--color-on-solid-80)] mb-8 max-w-2xl mx-auto">
            Can&rsquo;t make it to church? Join us online for our live services and experience worship from anywhere in the world.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            {watchUrl && (
              <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-lg bg-[var(--color-surface)] text-[var(--color-primary-strong)] hover:bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)] shadow-xl hover:shadow-2xl transition-all duration-300 group flex items-center justify-center gap-2"
                aria-label="Watch live stream"
              >
                <Play className="h-5 w-5" aria-hidden="true" />
                <span>Watch Live</span>
              </a>
            )}
            {youtubeChannelUrl && youtubeChannelUrl !== watchUrl && (
              <a
                href={youtubeChannelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-lg bg-transparent border-2 border-[var(--color-on-solid)] text-[var(--color-on-solid)] hover:bg-[var(--color-surface)] hover:text-[var(--color-primary-strong)] transition-all duration-300 flex items-center justify-center gap-2"
                aria-label="Visit YouTube channel"
              >
                <Video className="h-5 w-5" aria-hidden="true" />
                <span>YouTube Channel</span>
              </a>
            )}
          </div>

          {/* Service Schedule — from the streaming_schedule setting when set */}
          {streamingSchedule ? (
            <div className="max-w-2xl mx-auto">
              <div className="bg-[color-mix(in_srgb,var(--color-surface)_10%,transparent)] backdrop-blur-sm rounded-xl p-6 border border-[var(--color-on-solid-20)]">
                <div className="flex items-center gap-3 mb-3 justify-center">
                  <Calendar className="h-5 w-5" aria-hidden="true" />
                  <span className="font-semibold">Streaming Schedule</span>
                </div>
                <div className="text-[var(--color-on-solid-80)] whitespace-pre-line">{streamingSchedule}</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div className="bg-[color-mix(in_srgb,var(--color-surface)_10%,transparent)] backdrop-blur-sm rounded-xl p-6 border border-[var(--color-on-solid-20)]">
                <div className="flex items-center gap-3 mb-3">
                  <Calendar className="h-5 w-5" aria-hidden="true" />
                  <span className="font-semibold">Sabbath Services</span>
                </div>
                <div className="text-[var(--color-on-solid-80)] space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" aria-hidden="true" />
                    <span>9:00 AM - Sabbath School</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" aria-hidden="true" />
                    <span>10:30 AM - Main Service</span>
                  </div>
                </div>
              </div>

              <div className="bg-[color-mix(in_srgb,var(--color-surface)_10%,transparent)] backdrop-blur-sm rounded-xl p-6 border border-[var(--color-on-solid-20)]">
                <div className="flex items-center gap-3 mb-3">
                  <Calendar className="h-5 w-5" aria-hidden="true" />
                  <span className="font-semibold">Wednesday Prayer</span>
                </div>
                <div className="text-[var(--color-on-solid-80)] space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" aria-hidden="true" />
                    <span>6:00 PM - 7:30 PM</span>
                  </div>
                  <div className="text-sm text-[var(--color-on-solid-80)]">Prayer Meeting &amp; Bible Study</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default LiveStreamSection;
