"use client";

import { useEffect, useMemo, useState } from "react";
import AOS from "aos";
import { useRouter, useSearchParams } from "next/navigation";
import "aos/dist/aos.css";
import "../style.css";
import "../mobile.css";
import { useAuth } from "@/context/AuthContext";

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
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isAuthenticated, loading } = useAuth();
    const [paymentPopupOpen, setPaymentPopupOpen] = useState(false);

    const pendingPayment = useMemo(() => {
        if (searchParams.get("openPayment") !== "true") return null;
        const amountRaw = searchParams.get("amount");
        const orderNameRaw = searchParams.get("orderName");
        if (!amountRaw || !orderNameRaw) return null;
        const amount = Number(amountRaw);
        if (Number.isNaN(amount) || amount <= 0) return null;
        return {
            amount,
            orderName: orderNameRaw,
        };
    }, [searchParams]);

    useEffect(() => {
        AOS.init({
            duration: 800,
            easing: "ease-out-cubic",
            offset: 60,
            once: false,
        });
    }, []);

    useEffect(() => {
        void fetch("/api/analytics/visit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ page: "/" }),
        }).catch(() => {
            // Non-blocking analytics call
        });
    }, []);

    useEffect(() => {
        if (!pendingPayment) return;
        if (loading) return;

        if (!isAuthenticated) {
            const loginParams = new URLSearchParams({
                postLoginAction: "payment",
                amount: String(pendingPayment.amount),
                orderName: pendingPayment.orderName,
            });
            router.replace(`/login?${loginParams.toString()}`);
            return;
        }

        setPaymentPopupOpen(true);
    }, [isAuthenticated, loading, pendingPayment, router]);

    const closePaymentPopup = () => {
        setPaymentPopupOpen(false);
        router.replace("/");
    };

    const startPayment = () => {
        if (!pendingPayment) return;
        const paymentParams = new URLSearchParams({
            amount: String(pendingPayment.amount),
            orderName: pendingPayment.orderName,
        });
        window.location.href = `/payment?${paymentParams.toString()}`;
    };

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
            {paymentPopupOpen && pendingPayment && (
                <div style={overlayStyle} role="dialog" aria-modal="true">
                    <div style={modalStyle}>
                        <h2 style={titleStyle}>결제를 진행할까요?</h2>
                        <p style={descStyle}>
                            <strong>{pendingPayment.orderName}</strong>
                            <br />
                            {pendingPayment.amount.toLocaleString()}원
                        </p>
                        <div style={actionsStyle}>
                            <button style={secondaryBtnStyle} onClick={closePaymentPopup}>
                                닫기
                            </button>
                            <button style={primaryBtnStyle} onClick={startPayment}>
                                결제하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(3, 7, 18, 0.64)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1200,
    padding: 16,
};

const modalStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    background: "#0f1626",
    border: "1px solid rgba(148, 163, 184, 0.3)",
    boxShadow: "0 16px 48px rgba(2, 6, 23, 0.45)",
    padding: 24,
    color: "#f8fafc",
};

const titleStyle: React.CSSProperties = {
    margin: 0,
    marginBottom: 12,
    fontSize: 24,
    fontWeight: 700,
};

const descStyle: React.CSSProperties = {
    margin: 0,
    marginBottom: 20,
    color: "#cbd5e1",
    lineHeight: 1.5,
};

const actionsStyle: React.CSSProperties = {
    display: "flex",
    gap: 10,
};

const baseBtnStyle: React.CSSProperties = {
    flex: 1,
    borderRadius: 10,
    padding: "12px 14px",
    fontWeight: 700,
    cursor: "pointer",
    border: "none",
};

const secondaryBtnStyle: React.CSSProperties = {
    ...baseBtnStyle,
    background: "#1e293b",
    color: "#e2e8f0",
};

const primaryBtnStyle: React.CSSProperties = {
    ...baseBtnStyle,
    background: "#4f46e5",
    color: "#ffffff",
};
