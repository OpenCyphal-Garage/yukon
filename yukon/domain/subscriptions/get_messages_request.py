from dataclasses import dataclass
import typing


@dataclass
class GetMessagesRequest:
    specifiers_object: typing.Any
