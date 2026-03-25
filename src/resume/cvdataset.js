import tech from "./tech";
import management from "./management";
import finance from "./finance";

export default function cvDatasetCollectiont() {
  const cvDataset = {
    ...tech,
    ...management,
    ...finance
  };

  return cvDataset;
}