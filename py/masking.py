import random
import copy

def repeat(n, fn):
    if n == 1:
        return fn

    def go(*args):
        return repeat(n - 1, fn)(fn(*args))

    return go


MASK = '<MASK>'


def random_mask(tokens):
    i = random.choice(list(filter(lambda i: tokens[i] != MASK, range(len(tokens)))))
    masked_tokens = copy.copy(tokens)
    masked_tokens[i] = MASK
    return masked_tokens


print(repeat(2,random_mask)(['a','b','c','d','e']))