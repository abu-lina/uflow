'use client';


import { motion } from 'framer-motion';

import { AboutCard } from '@/components/shared/AboutCard';
import { quotes } from '@/constants/quotes';

export function AboutSection() {

  return (
    <section
      aria-labelledby="about-heading"
      className="flex h-screen w-full scroll-mt-16 flex-col items-center justify-center gap-8 px-4 focus:outline-none sm:px-6 lg:px-8"
      id="about"
    >
      <div className="flex w-full max-w-screen-xl flex-col items-center gap-8 sm:gap-16">
        <motion.div
          className="flex w-full flex-col items-center gap-4 sm:gap-6"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <h2
            className="w-full max-w-[960px] text-center font-inter-tight text-2xl font-medium leading-tight text-black sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl"
            id="about-heading"
          >
            Warum braucht es einen <span className="text-mint">muslimischen Marktplatz</span>?
          </h2>
          <p className="w-full max-w-2xl text-center font-inter text-base leading-snug text-content sm:text-lg md:text-xl lg:text-2xl">
            Mit Ummah Flow möchten wir – mit der Erlaubnis Allahs ﷲ – unsere Ummah wieder stark
            machen.
          </p>
        </motion.div>
        <motion.div
          className="flex w-full flex-col items-center gap-2"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <AboutCard quote={quotes[2]} />
        </motion.div>
      </div>
    </section>
  );
}
