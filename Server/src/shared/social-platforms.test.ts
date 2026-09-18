import { describe, expect, it } from "vitest";

import { detectPlatform, isRepoUrl } from "./social-platforms";

describe("detectPlatform", () => {
  it("recognises the common developer profile URLs", () => {
    expect(detectPlatform("https://github.com/octocat")).toEqual({
      platform: "GITHUB",
      username: "octocat",
      canonicalUrl: "https://github.com/octocat",
    });
    expect(detectPlatform("https://www.linkedin.com/in/jane-doe-123/")?.platform).toBe("LINKEDIN");
    expect(detectPlatform("https://in.linkedin.com/in/jane-doe")?.platform).toBe("LINKEDIN");
    expect(detectPlatform("https://leetcode.com/u/neal_wu/")?.username).toBe("neal_wu");
    expect(detectPlatform("https://leetcode.com/neal_wu")?.canonicalUrl).toBe("https://leetcode.com/u/neal_wu");
    expect(detectPlatform("https://codeforces.com/profile/tourist")?.username).toBe("tourist");
    expect(detectPlatform("https://stackoverflow.com/users/22656/jon-skeet")).toEqual({
      platform: "STACKOVERFLOW",
      username: "22656",
      canonicalUrl: "https://stackoverflow.com/users/22656",
    });
    expect(detectPlatform("https://www.hackerrank.com/profile/someone")?.platform).toBe("HACKERRANK");
    expect(detectPlatform("https://www.kaggle.com/someone")?.platform).toBe("KAGGLE");
    expect(detectPlatform("https://dev.to/ben")?.platform).toBe("DEVTO");
    expect(detectPlatform("https://hashnode.com/@someone")?.platform).toBe("HASHNODE");
    expect(detectPlatform("https://medium.com/@someone")?.platform).toBe("MEDIUM");
    expect(detectPlatform("https://twitter.com/jack")?.canonicalUrl).toBe("https://x.com/jack");
  });

  it("tolerates a missing scheme, query strings and trailing slashes", () => {
    expect(detectPlatform("github.com/octocat/")?.canonicalUrl).toBe("https://github.com/octocat");
    expect(detectPlatform("  https://github.com/octocat?tab=repositories#x ")?.username).toBe("octocat");
  });

  it("rejects unsupported sites and non-profile pages", () => {
    expect(detectPlatform("https://amazon.com/some-user")).toBeNull();
    expect(detectPlatform("https://example.com")).toBeNull();
    expect(detectPlatform("https://github.com")).toBeNull();
    expect(detectPlatform("https://github.com/octocat/hello-world")).toBeNull(); // a repo, not a profile
    expect(detectPlatform("https://github.com/login")).toBeNull();
    expect(detectPlatform("https://linkedin.com/company/acme")).toBeNull();
    expect(detectPlatform("https://stackoverflow.com/questions/1")).toBeNull();
    expect(detectPlatform("ftp://github.com/octocat")).toBeNull();
    expect(detectPlatform("not a url at all")).toBeNull();
    expect(detectPlatform("")).toBeNull();
  });

  it("does not let a look-alike host through", () => {
    expect(detectPlatform("https://github.com.evil.io/octocat")).toBeNull();
    expect(detectPlatform("https://notgithub.com/octocat")).toBeNull();
  });
});

describe("isRepoUrl", () => {
  it("accepts owner/repo on known code hosts only", () => {
    expect(isRepoUrl("https://github.com/octocat/hello-world")).toBe(true);
    expect(isRepoUrl("https://gitlab.com/group/sub/project")).toBe(true);
    expect(isRepoUrl("https://github.com/octocat")).toBe(false);
    expect(isRepoUrl("http://github.com/octocat/hello-world")).toBe(false);
    expect(isRepoUrl("https://example.com/octocat/hello-world")).toBe(false);
  });
});
