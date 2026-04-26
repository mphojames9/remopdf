import tech from "./tech";
import management from "./management";
import finance from "./finance";
import securityAndSafety from "./securityAndSafety";
import beautyAndHealth from "./beautyAndHealth"

export default function cvDatasetCollectiont() {
  const cvDataset = {
    ...tech,
    ...management,
    ...finance,
    ...securityAndSafety,
    ...beautyAndHealth
  };

  return cvDataset;
}