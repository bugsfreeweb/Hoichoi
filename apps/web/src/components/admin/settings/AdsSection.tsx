"use client";

import { Field, Section, TextArea } from "./ui";
import { useSettings } from "./state";

export function AdsSection() {
  const { ads, setAds } = useSettings();
  return (
    <Section
      kicker="Ad slots"
      title="বিজ্ঞাপন স্লট"
      hint="প্রতিটি স্লটে যেকোনো অ্যাড-নেটওয়ার্ক কোড / HTML / <script> ব্লক পেস্ট করুন (AdSense, Adsterra, ইন-হাউজ ব্যানার…)। খালি রাখলে ডিফল্ট স্পনসর কার্ড দেখাবে। সংরক্ষণের পর সরাসরি সাইটে লাইভ হয়।"
    >
      <Field label="Leaderboard (হোমপেজের শীর্ষ · ~728×90)">
        <TextArea rows={3} className="font-mono-x text-[12px]" placeholder={'<ins class="adsbygoogle" ... /> অথবা ব্যানার HTML'} value={ads.ad_leaderboard_html} onChange={(e) => setAds({ ad_leaderboard_html: e.target.value })} />
      </Field>
      <Field label="Strip (হোমপেজের নিচের ডার্ক ব্যানার · ~970×64)">
        <TextArea rows={3} className="font-mono-x text-[12px]" placeholder={'<a href="..."><img src="..." /></a>'} value={ads.ad_strip_html} onChange={(e) => setAds({ ad_strip_html: e.target.value })} />
      </Field>
      <Field label="Infeed (গ্রিডে প্রতি ৪র্থ আইটেমে)">
        <TextArea rows={4} className="font-mono-x text-[12px]" placeholder={"নিউজফিড-স্টাইলের বিজ্ঞাপন কোড"} value={ads.ad_infeed_html} onChange={(e) => setAds({ ad_infeed_html: e.target.value })} />
      </Field>
      <Field label="Rect (আর্টিকেল পেজে · ~300×250)">
        <TextArea rows={4} className="font-mono-x text-[12px]" placeholder={"আর্টিকেল ভেতরের বক্স বিজ্ঞাপন"} value={ads.ad_rect_html} onChange={(e) => setAds({ ad_rect_html: e.target.value })} />
      </Field>
    </Section>
  );
}