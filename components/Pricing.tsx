"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const CheckIcon = ({ color = "currentColor" }: { color?: string }) => (
    <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pricing-check-icon"
    >
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

interface PricingPlan {
    name: string;
    subDescription: string;
    price: string;
    period: string;
    features: string[];
    cta: string;
    popular?: boolean;
    tier: "free" | "plus" | "pro";
}

const plans: PricingPlan[] = [
    {
        name: "무료",
        subDescription: "제한적인 AI 생성과 기본 기능을 제공합니다.",
        price: "0",
        period: "/월",
        features: [
            "하루 5회 AI 생성",
            "기본 수식 자동화",
            "광고 없는 경험",
            "커뮤니티 지원",
            "AI 코드 생성",
        ],
        cta: "무료로 시작하기",
        tier: "free",
    },
    {
        name: "플러스 요금제",
        subDescription: "더 많은 기능과 우선 지원을 받으세요.",
        price: "19,900",
        period: "/월",
        features: [
            "월 220회 AI 생성",
            "고급 AI 모델",
            "팀 공유 기능",
            "우선 지원 서비스",
            "월 1회 1:1 컨설팅",
        ],
        cta: "플러스 시작하기",
        popular: true,
        tier: "plus",
    },
    {
        name: "프로 요금제",
        subDescription: "모든 프리미엄 기능을 사용하세요.",
        price: "49,900",
        period: "/월",
        features: [
            "월 660회 AI 생성",
            "팀 협업 기능",
            "API 액세스",
            "전담 지원 서비스",
            "최우선 업데이트",
        ],
        cta: "프로 시작하기",
        tier: "pro",
    },
];

export default function Pricing() {
    const router = useRouter();
    const { isAuthenticated, loading } = useAuth();

    const paymentMetaByTier: Record<"plus" | "pro", { amount: number; orderName: string }> = {
        plus: { amount: 19900, orderName: "Nova AI 플러스 요금제" },
        pro: { amount: 49900, orderName: "Nova AI 프로 요금제" },
    };

    const handlePlanClick = (tier: PricingPlan["tier"]) => {
        if (tier === "free") {
            router.push("/login");
            return;
        }

        if (loading) return;

        const paymentMeta = paymentMetaByTier[tier];
        const paymentParams = new URLSearchParams({
            amount: String(paymentMeta.amount),
            orderName: paymentMeta.orderName,
        });

        if (!isAuthenticated) {
            const loginParams = new URLSearchParams({
                postLoginAction: "payment",
                amount: String(paymentMeta.amount),
                orderName: paymentMeta.orderName,
            });
            router.push(`/login?${loginParams.toString()}`);
            return;
        }

        router.push(`/?openPayment=true&${paymentParams.toString()}`);
    };

    return (
        <section id="pricing" className="pricing-section">
            <div className="section-inner">
                <div className="pricing-header">
                    <h2 className="pricing-title">이용요금 안내</h2>
                    <p className="pricing-subtitle">
                        합리적인 가격으로 강력한 AI 기능을 경험하세요.
                        <br />
                        필요에 맞는 요금제를 선택하고 지금 바로 시작하세요.
                    </p>
                </div>

                <div className="pricing-cards-wrapper">
                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            className={`pricing-card-v2 pricing-card-v2--${plan.tier} ${
                                plan.popular ? "pricing-card-v2--popular" : ""
                            }`}
                        >
                            {plan.popular && (
                                <div className="pricing-badge-v2">
                                    <span>BEST</span>
                                </div>
                            )}

                            <div className="pricing-card-v2__content">
                                <div className="pricing-card-v2__header">
                                    <h3 className="pricing-card-v2__name">
                                        {plan.name}
                                    </h3>
                                    <p className="pricing-card-v2__desc">
                                        {plan.subDescription}
                                    </p>
                                </div>

                                <div className="pricing-card-v2__price-block">
                                    <div className="pricing-card-v2__price-row">
                                        {plan.price !== "0" && (
                                            <span className="pricing-card-v2__currency">
                                                ₩
                                            </span>
                                        )}
                                        <span className="pricing-card-v2__price">
                                            {plan.price === "0"
                                                ? "무료"
                                                : plan.price}
                                        </span>
                                        {plan.price !== "0" && (
                                            <span className="pricing-card-v2__unit">
                                                {plan.period}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="pricing-card-v2__divider" />

                                <ul className="pricing-card-v2__features">
                                    {plan.features.map((feature, i) => (
                                        <li
                                            key={i}
                                            className="pricing-card-v2__feature"
                                        >
                                            <span className="pricing-card-v2__check-wrap">
                                                <CheckIcon
                                                    color={
                                                        plan.popular
                                                            ? "#ccc"
                                                            : "#555"
                                                    }
                                                />
                                            </span>
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <button
                                onClick={() => handlePlanClick(plan.tier)}
                                className={`pricing-cta-v2 pricing-cta-v2--${plan.tier}`}
                            >
                                {plan.cta}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
