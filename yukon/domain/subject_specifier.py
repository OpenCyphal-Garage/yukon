from dataclasses import dataclass


@dataclass
class SubjectSpecifier:
    subject_id: int
    datatype: str

    def __init__(self):
        pass

    @staticmethod
    def from_string(string: str):
        split_values = string.split(":")
        specifier = SubjectSpecifier()
        specifier.subject_id = int(split_values[0])
        specifier.datatype = split_values[1]
        return specifier
    
    def __hash__(self) -> int:
        return hash((self.subject_id, self.datatype))

    def __str__(self) -> str:
        return f"{self.subject_id}:{self.datatype}"
