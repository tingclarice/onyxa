import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

let pathname = "/beranda";
mock.module("next/navigation", {
  namedExports: { usePathname: () => pathname },
});
mock.module("next/link", {
  defaultExport: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => createElement("a", { href }, children),
});
mock.module(
  pathToFileURL(
    resolve("src/features/business-management/ui/business-forms.tsx"),
  ).href,
  {
    namedExports: {
      CreateBusinessForm: () =>
        createElement(
          "form",
          null,
          createElement("button", null, "Buat usaha"),
        ),
    },
  },
);
const delivery = import("./onboarding");
const navigation = import("@/components/app-navigation");
beforeEach(() => {
  pathname = "/beranda";
});

test("business-free onboarding retains creation and links directly to the inbox", async () => {
  const { BusinessWorkspace } = await delivery;
  const html = renderToStaticMarkup(
    createElement(
      BusinessWorkspace,
      {
        businessReady: false,
      },
      createElement("p", null, "business-content"),
    ),
  );
  assert.match(html, /Buat usaha/);
  assert.match(html, /href="\/inbox"[^>]*>View Inbox/);
  assert.doesNotMatch(
    html,
    /business-content|Saya menunggu undangan|Kode undangan/,
  );
});

test("business-free users can open the inbox and create-business page", async () => {
  const { BusinessWorkspace } = await delivery;
  for (const route of ["/inbox", "/bisnis/baru"]) {
    pathname = route;
    const html = renderToStaticMarkup(
      createElement(
        BusinessWorkspace,
        {
          businessReady: false,
        },
        createElement("p", null, "requested-page"),
      ),
    );
    assert.match(html, /requested-page/);
    assert.doesNotMatch(html, /Bagaimana Anda ingin bergabung/);
  }
});

test("business-only pages keep onboarding until a membership exists", async () => {
  pathname = "/barang";
  const { BusinessWorkspace } = await delivery;
  const html = renderToStaticMarkup(
    createElement(
      BusinessWorkspace,
      {
        businessReady: false,
      },
      createElement("p", null, "business-content"),
    ),
  );
  assert.match(html, /View Inbox/);
  assert.doesNotMatch(html, /business-content/);
});

test("navigation renders no desktop sidebar or mobile bar without a business", async () => {
  const { AppNavigation } = await navigation;
  assert.equal(
    renderToStaticMarkup(
      createElement(AppNavigation, { businessReady: false }),
    ),
    "",
  );
  const html = renderToStaticMarkup(
    createElement(AppNavigation, { businessReady: true }),
  );
  assert.match(html, /Navigasi utama/);
  assert.match(html, /href="\/scan"/);
});
