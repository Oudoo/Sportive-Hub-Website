import React from 'react';
import { motion } from 'framer-motion';

const About: React.FC = () => {
    return (
        <section id="about" className="py-24 bg-background relative overflow-hidden">
            <div className="container mx-auto px-6 relative z-10">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.span
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-primary font-bold tracking-[0.2em] uppercase mb-4 block"
                    >
                        Our Vision
                    </motion.span>
                    <motion.h3
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-heading font-bold text-white uppercase mb-12"
                    >
                        <span className="text-stroke-2 text-transparent bg-clip-text bg-white/20">About</span> Us
                    </motion.h3>
                    
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="space-y-6 text-xl text-gray-300 font-light leading-relaxed text-left md:text-center"
                    >
                        <p>
                            At Sportive Hub, we redefine the concept of wellness by delivering a premium, integrated healthcare experience.
                        </p>
                        <p>
                            Our center combines physiotherapy, recovery, fitness, and advanced medical services under one roof—designed to help you move better, recover faster, and perform at your highest level.
                        </p>
                        <p>
                            We focus on personalized care, evidence-based treatment, and a results-driven approach—ensuring every client receives a tailored journey that fits their goals and lifestyle.
                        </p>
                        <p className="text-2xl font-bold text-white mt-8 pt-8 border-t border-white/10">
                            Sportive Hub is not just a clinic… <span className="text-primary">it’s your wellness destination.</span>
                        </p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default About;
