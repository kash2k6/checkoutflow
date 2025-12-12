'use client';

import { Dialog } from '@whop/react/components';
import { HelpCircle } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  // Convert YouTube URL to embed format
  const videoId = 'nNY_4gCsyjI';
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content 
        size="3" 
        className="max-w-[calc(100vw-2rem)] md:max-w-[56rem] max-h-[90vh] mx-4 md:mx-auto"
      >
        <Dialog.Title className="text-base md:text-lg flex items-center gap-2">
          <HelpCircle className="w-5 h-5" />
          How to Embed Your Checkout Flow
        </Dialog.Title>
        <Dialog.Description className="text-sm md:text-base">
          Learn how to embed your checkout flow on your website
        </Dialog.Description>

        <div className="flex-1 overflow-y-auto space-y-4 md:space-y-6 mt-4">
          {/* Video Embed */}
          <div className="w-full rounded-lg overflow-hidden bg-gray-a1 dark:bg-gray-a3 border border-gray-a4">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src={embedUrl}
                title="How to Embed Checkout Flow"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ border: 0 }}
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-3 md:space-y-4">
            <h3 className="text-base md:text-lg font-semibold text-gray-12 dark:text-white">
              Quick Steps:
            </h3>
            <ol className="list-decimal list-inside space-y-2 md:space-y-3 text-sm md:text-base text-gray-10 dark:text-gray-9">
              <li>Create or select a checkout flow in the Flow Builder tab</li>
              <li>Click the "Get Embed Code" button on your flow</li>
              <li>Copy the embed code for the page you want to embed (checkout, upsell, downsell, or confirmation)</li>
              <li>Paste the embed code into your website where you want the checkout flow to appear</li>
              <li>The checkout flow will automatically load and display on your page</li>
            </ol>
          </div>

          {/* Additional Info */}
          <div className="bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800 rounded-lg p-3 md:p-4">
            <p className="text-xs md:text-sm text-accent-900 dark:text-accent-100">
              <strong>Tip:</strong> You can embed different parts of your flow on different pages. 
              For example, embed the checkout code on your product page, and the confirmation code on your thank you page.
            </p>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

