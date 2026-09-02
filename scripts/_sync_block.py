#!/usr/bin/env python3
"""Replace a marked block in a target file, preserving everything outside it.

Driven by env vars (BLOCK, TARGET, START, END) from install-reference.sh. The
marker handling lives here rather than in sed so that a block containing
regex-significant characters cannot corrupt the target file.

On the first run there are no markers yet, and the target may already carry a
hand-written copy of this section. The section to replace is derived from the
block's own first heading rather than from a pattern passed in by the caller:
the block knows what it is, and a caller-supplied regex is one quoting mistake
away from silently appending a duplicate instead of replacing.
"""
import os
import pathlib
import re

block = pathlib.Path(os.environ["BLOCK"]).read_text(encoding="utf-8").strip()
target = pathlib.Path(os.environ["TARGET"])
start, end = os.environ["START"], os.environ["END"]

managed = start + "\n" + block + "\n" + end
original = target.read_text(encoding="utf-8")
text = original

pattern = re.compile(re.escape(start) + r".*?" + re.escape(end), re.S)

if pattern.search(text):
    new = pattern.sub(lambda _: managed, text, count=1)
    action = "updated managed block in"
else:
    action = "appended managed block to"

    # The block's first line, when it is a top-level heading, identifies any
    # hand-written section this block supersedes. Replace it instead of sitting
    # next to a stale duplicate of itself.
    first = block.splitlines()[0].strip()
    heading = re.match(r"^(#+)\s+(.*)$", first)
    if heading:
        legacy = re.compile(
            r"^#{1,%d}\s+%s.*?(?=^\#{1,%d}\s|\Z)"
            % (len(heading.group(1)), re.escape(heading.group(2)), len(heading.group(1))),
            re.S | re.M | re.I,
        )
        if legacy.search(text):
            text = legacy.sub("", text)
            action = "replaced hand-written section in"

    text = text.rstrip()
    new = (text + "\n\n" if text else "") + managed + "\n"

if new != original:
    target.write_text(new, encoding="utf-8")
    print(action + " " + str(target))
else:
    print("already current: " + str(target))
