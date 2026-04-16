import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, MapPin } from 'lucide-react';

const Hero: React.FC = () => {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"]
    });

    const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

    return (
        <section ref={ref} id="home" className="relative h-screen min-h-[700px] flex items-center overflow-hidden">
            {/* Parallax Background */}
            <motion.div
                style={{ y, opacity }}
                className="absolute inset-0 z-0"
            >
                <img
                    src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
                    alt="Athlete stretching"
                    className="w-full h-full object-cover scale-110"
                />
                {/* Cinematic Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
            </motion.div>

            <div className="container mx-auto px-6 relative z-10 pt-20">
                <div className="max-w-4xl">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={{
                            hidden: { opacity: 0 },
                            visible: {
                                opacity: 1,
                                transition: {
                                    staggerChildren: 0.1
                                }
                            }
                        }}
                    >
                        <motion.h2
                            variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}
                            className="text-primary font-bold tracking-[0.2em] uppercase mb-4"
                        >
                            Elite Performance Center
                        </motion.h2>

                        <motion.h1
                            variants={{ hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0 } }}
                            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                            className="text-6xl md:text-8xl font-heading font-bold text-heading leading-[0.9] mb-8"
                        >
                            RECOVER FASTER <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                                PERFORM BETTER
                            </span>
                        </motion.h1>

                        <motion.p
                            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="text-xl md:text-2xl text-gray-300 mb-10 max-w-xl leading-relaxed font-light"
                        >
                            The premier hub for sports recovery, physiotherapy, and modern medical care designed for peak performance.
                        </motion.p>

                        <motion.div
                            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                            className="flex flex-col sm:flex-row gap-6"
                        >
                            <a
                                href="#contact"
                                className="group relative px-8 py-4 bg-primary text-white overflow-hidden rounded-none font-bold text-lg tracking-wider uppercase clip-path-slant"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    Start Recovery <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </span>
                                <div className="absolute inset-0 bg-white transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 mix-blend-overlay"></div>
                            </a>

                            <a
                                href="#locations"
                                className="group px-8 py-4 border border-white/30 text-white hover:bg-white/10 transition-all font-bold text-lg tracking-wider uppercase flex items-center justify-center gap-2 backdrop-blur-sm"
                            >
                                Our Locations <MapPin size={20} />
                            </a>
                        </motion.div>
                    </motion.div>
                </div>
            </div>

            {/* Scroll Indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: [0, 10, 0] }}
                transition={{ delay: 1, duration: 2, repeat: Infinity }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50 text-sm tracking-widest uppercase flex flex-col items-center gap-2"
            >
                Scroll
                <div className="w-[1px] h-10 bg-gradient-to-b from-white to-transparent"></div>
            </motion.div>
        </section>
    );
};

export default Hero;
