"use client";

import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import "../style.css";
import "../mobile.css";

import Home from "../../components/Home";
import ExamTyping from "../../components/ExamTyping";
import GeminiAI from "../../components/GeminiAI";
import Reviews from "../../components/Reviews";
import CostComparison from "../../components/CostComparison";
import Pricing from "../../components/Pricing";
import FAQ from "../../components/FAQ";
import CTA from "../../components/CTA";
import { Navbar } from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function FormuLite() {
    useEffect(() => {
        AOS.init({
            duration: 800,
            easing: "ease-out-cubic",
            offset: 60,
            once: false,
        });
    }, []);

    return (
        <div>
            <Navbar />

            <Home />
            <ExamTyping />
            <GeminiAI />
            <Reviews />
            <CostComparison />
            <Pricing />
            <FAQ />
            <CTA />
            <Footer />
        </div>
    );
}
